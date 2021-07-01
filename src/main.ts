import express from 'express'
import rateLimit from 'express-rate-limit'
import cors from 'cors'
import { MetroApi } from './api/metro-api'
import { ApiCache } from './cache/cache'
import { ISubwayData } from './api/model'
import { Api } from './api/api'

// A port can be provided through environmental variables. Fallback value is "5134"
const port = parseInt(process.env.PORT ?? '5134')

// A default provider that this api will use
const api = new MetroApi()

// Fallback providers in case if default api fails
const fallbackApis: Api[] = []

// Cache layer
const cache = new ApiCache<ISubwayData>('./db/data.json')

// Interval of [loop] - set to 1 hour by default
const loopInterval = 60 * 60 * 1000
const loop = async () => {
  // Will try to fetch up-to-date data and save the results to cache
  const fetch = async (provider: Api): Promise<boolean> => {
    try {
      const data = await provider.getData()
      await cache.saveToCache(data)
      return true
    }
    catch (e) {
      console.error(e)
      return false
    }
  }

  // Will iterate through providers until it gets a response
  for (const provider of [api, ...fallbackApis]) {
    const response = await fetch(provider)
    if (response) break
  }

  setInterval(() => loop(), loopInterval)
}

const main = async () => {
  // Try to load cached data before starting the server
  await cache.tryLoadFromCache()

  // If the cache is empty, then fetch up-to-date data from a provider
  await loop()

  // Instantiate the server
  const server = express()
  server.use(cors())

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
  });

  server.use(limiter)

  const methods: { [path: string]: () => any } = {
    '/data/all': () => cache.currentValue!,
    '/data/holidays': () => cache.currentValue!.events,
    '/data/lines': () => cache.currentValue!.lines,
    '/data/stations': () => cache.currentValue!.stations,
  }

  for (const path in methods) {
    server.get(path, (_, res) => {
      if (cache.currentValue) {
        res.send(methods[path]())
      }
      else {
        res.status(500).send({ error: 'Try again later' })
      }
    })
  }

  server.get('/data/original', async (_, res) => {
    try {
      const value = await api.getOriginal()
      res.status(200).send(value)
    }
    catch (e) {
      res.status(500).send(e)
    }
  })

  server.listen(port, () => {
    console.log(`Listening on ${port}`)
  })
}

main()
