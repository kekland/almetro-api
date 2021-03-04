import { JsonSubwayApi } from "./api/api";
import express from 'express'
import rateLimit from 'express-rate-limit'
import { Database } from "./data/db";
import { SubwayData } from "./data/model";
import cors from "cors"

const api = new JsonSubwayApi()
const db = new Database<SubwayData>('./db/data.json')

const fetchAndUpdate = async (): Promise<void> => {
  try {
    const data = await api.fetchData()
    await db.setData(data)
  }
  catch (e) {
    console.log(e)
  }
}

const main = async () => {
  setInterval(fetchAndUpdate, 15 * 60 * 1000)

  try {
    await db.fetchCachedData()
  }
  catch (e) {
    console.log('No previously cached data found')
    await fetchAndUpdate()
  }

  const server = express()
  server.use(cors())

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
  });

  server.use(limiter)

  server.get('/data', (req, res) => {
    try {
      const data = db.getLastCachedData()
      res.status(200).send(data)
    }
    catch (error) {
      res.status(500).send({ error })
    }
  })

  server.get('/data/holidays', (req, res) => {
    try {
      const data = db.getLastCachedData()
      res.status(200).send(data.holidays)
    }
    catch (error) {
      res.status(500).send({ error })
    }
  })

  server.get('/data/stations', (req, res) => {
    try {
      const data = db.getLastCachedData()
      res.status(200).send(data.stations)
    }
    catch (error) {
      res.status(500).send({ error })
    }
  })

  server.get('/data/schedules', (req, res) => {
    try {
      const data = db.getLastCachedData()
      res.status(200).send(data.schedules)
    }
    catch (error) {
      res.status(500).send({ error })
    }
  })

  server.get('/data/today', (req, res) => {
    try {
      const data = db.getLastCachedData()
      const now = new Date(Date.now())

      const isHoliday =
        now.getDay() === 0 ||
        now.getDay() === 6 ||
        data.holidays.some((v) => {
          const date = new Date(v.date)
          return date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()
        })

      res.status(200).send({
        stations: data.stations,
        holidays: data.holidays,
        schedule: isHoliday ? data.schedules.holiday : data.schedules.normal,
        isHoliday,
      })
    }
    catch (error) {
      res.status(500).send({ error })
    }
  })

  server.listen(5134, () => {
    console.log('Listening on 5134')
  })
}

main()