#!/usr/bin/env node

const childProcess = require('child_process')
const fs = require('fs')
const path = require('path')
const util = require('util')
const request = require('request')
const promiseRetryer = require('promise-retryer')(Promise)

const token = process.env.GITHUB_ACCESS_TOKEN
const version = require('../package').version
const repo = 'yoshuawuyts/vmd'

checkToken()
  .then(archiveAssets)
  .then(createRelease)
  .then(uploadAssets)
  .then(publishRelease)
  .catch((err) => {
    console.error(err.message || err)
    process.exit(1)
  })

function checkToken () {
  if (!token) {
    return Promise.reject('GITHUB_ACCESS_TOKEN environment variable not set\nSet it to a token with repo scope created from https://github.com/settings/tokens/new')
  } else {
    return Promise.resolve(token)
  }
}

function archiveAssets () {
  const outPath = path.join(__dirname, '..', 'build')

  const assets = [
    {
      name: `vmd-${version}-mac.zip`,
      path: path.join(outPath, 'vmd-darwin-x64', 'vmd.app')
    },
    {
      name: `vmd-${version}-mac.tar.gz`,
      path: path.join(outPath, 'vmd-darwin-x64', 'vmd.app')
    },
    {
      name: `vmd-${version}-linux-ia32.zip`,
      path: path.join(outPath, 'vmd-linux-ia32')
    },
    {
      name: `vmd-${version}-linux-ia32.tar.gz`,
      path: path.join(outPath, 'vmd-linux-ia32')
    },
    {
      name: `vmd-${version}-linux-x64.zip`,
      path: path.join(outPath, 'vmd-linux-x64')
    },
    {
      name: `vmd-${version}-linux-x64.tar.gz`,
      path: path.join(outPath, 'vmd-linux-x64')
    },
    {
      name: `vmd-${version}-win32-ia32.zip`,
      path: path.join(outPath, 'vmd-win32-ia32')
    },
    {
      name: `vmd-${version}-win32-ia32.tar.gz`,
      path: path.join(outPath, 'vmd-win32-ia32')
    },
    {
      name: `vmd-${version}-win32-x64.zip`,
      path: path.join(outPath, 'vmd-win32-x64')
    },
    {
      name: `vmd-${version}-win32-x64.tar.gz`,
      path: path.join(outPath, 'vmd-win32-x64')
    }
  ]

  function archiveAsset (asset) {
    if (/\.zip$/.test(asset.name)) {
      return zipAsset(asset)
    }

    if (/\.tar\.gz$/.test(asset.name)) {
      return targzAsset(asset)
    }
  }

  return Promise.all(assets.map(archiveAsset))
}

function zipAsset (asset) {
  return new Promise((resolve, reject) => {
    const assetBase = path.basename(asset.path)
    const assetDirectory = path.dirname(asset.path)
    const outPath = path.join(__dirname, '..', 'build', asset.name)

    console.log(`zipping ${assetBase} to ${asset.name}`)

    if (!fs.existsSync(asset.path)) {
      return reject(new Error(`${asset.path} does not exist`))
    }

    const command = `zip --recurse-paths --symlinks '${outPath}' '${assetBase}'`
    const options = {
      cwd: assetDirectory,
      maxBuffer: Infinity
    }

    childProcess.exec(command, options, (err) => {
      if (err) {
        reject(err)
      } else {
        asset.path = outPath
        resolve(asset)
      }
    })
  })
}

function targzAsset (asset) {
  return new Promise((resolve, reject) => {
    const assetBase = path.basename(asset.path)
    const assetDirectory = path.dirname(asset.path)
    const outPath = path.join(__dirname, '..', 'build', asset.name)

    console.log(`gzipping ${assetBase} to ${asset.name}`)

    if (!fs.existsSync(asset.path)) {
      return reject(new Error(`${asset.path} does not exist`))
    }

    const command = `tar -czf '${outPath}' '${assetBase}'`
    const options = {
      cwd: assetDirectory,
      maxBuffer: Infinity
    }

    childProcess.exec(command, options, (err) => {
      if (err) {
        reject(err)
      } else {
        asset.path = outPath
        resolve(asset)
      }
    })
  })
}

function createRelease (assets) {
  const options = {
    uri: `https://api.github.com/repos/${repo}/releases`,
    headers: {
      Authorization: `token ${token}`,
      'User-Agent': `node/${process.versions.node}`
    },
    json: {
      tag_name: `${version}`,
      target_commitish: 'master',
      name: `vmd v${version}`,
      body: 'An awesome new release :tada:',
      draft: true,
      prerelease: false
    }
  }

  return new Promise((resolve, reject) => {
    console.log(`creating new draft release v${version}`)

    request.post(options, (err, response, body) => {
      if (err) {
        return reject(Error(`Request failed: ${err.message || err}`))
      }

      if (response.statusCode !== 201) {
        return reject(Error(`Non-201 response: ${response.statusCode}\n${util.inspect(body)}`))
      }

      resolve({assets: assets, draft: body})
    })
  })
}

function publishRelease (release) {
  const options = {
    uri: release.draft.url,
    headers: {
      Authorization: `token ${token}`,
      'User-Agent': `node/${process.versions.node}`
    },
    json: {
      draft: false
    }
  }

  return new Promise((resolve, reject) => {
    console.log('publishing release')

    request.post(options, (err, response, body) => {
      if (err) {
        return reject(Error(`Request failed: ${err.message || err}`))
      }

      if (response.statusCode !== 200) {
        return reject(Error(`Non-200 response: ${response.statusCode}\n${util.inspect(body)}`))
      }

      resolve(body)
    })
  })
}

function uploadAssets (release) {
  return Promise.all(release.assets.map((asset) => {
    return uploadAsset(release.draft, asset)
  })).then(() => release)
}

function uploadAsset (release, asset) {
  return promiseRetryer.run({
    delay: function (attempt) {
      return attempt * 1000
    },
    onAttempt: function (attempt) {
      console.log(`attempt ${attempt} to upload ${asset.name}`)
    },
    onError: function (err, attempt) {
      console.log(`failed to upload ${asset.name} at attempt ${attempt}: ${err.message || err}`)
    },
    maxRetries: 3,
    promise: function (attempt) {
      return upload(release, asset)
    }
  })

  function upload (release, asset) {
    const contentType = {
      '.zip': 'application/zip',
      '.gz': 'application/tar+gzip'
    }[path.extname(asset.name)]

    const options = {
      uri: release.upload_url.replace(/\{.*$/, `?name=${asset.name}`),
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': contentType,
        'Content-Length': fs.statSync(asset.path).size,
        'User-Agent': `node/${process.versions.node}`
      }
    }

    return new Promise((resolve, reject) => {
      const assetRequest = request.post(options, (err, response, body) => {
        if (err) {
          return reject(Error(`Uploading asset failed: ${err.message || err}`))
        }

        if (response.statusCode >= 400) {
          return reject(Error(`400+ response: ${response.statusCode}\n${util.inspect(body)}`))
        }

        resolve(asset)
      })

      fs.createReadStream(asset.path).pipe(assetRequest)
    })
  }
}
