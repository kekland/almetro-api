import { ISubwayData, ISubwayLine, ISubwayLineSchedule, ISubwayScheduleEvent, ISubwayScheduleType, ISubwayStation, ISubwayStationSchedule } from "./model"
import { Api } from "./api"
import axios from 'axios'

interface IMetroApiStation {
  id: string
  station_id: string
  name: string
  name_eng: string
  name_kaz: string
  latitude: string
  longitude: string
  station_order: string
  next_station_schedule_workday: string
  prev_station_schedule_workday: string
  next_station_schedule_holiday: string
  prev_station_schedule_holiday: string
  [key: string]: string
}

interface IMetroApiHoliday {
  name: string
  date: string
  type: string
}

interface IMetroApiInfo {
  id: string
  station_id: string
  type_id: string
  content: string
  content_kaz: string
  content_eng: string
}

interface IMetroApiResponse {
  stations: IMetroApiStation[]
  holidays: IMetroApiHoliday[]
  info: IMetroApiInfo[]
}

export class MetroApi implements Api {
  // Converts a string of format HH:MM:SS to a number with value of the number
  // of seconds passed since midnight (00:00:00)
  protected timeStringToNumber(data: string) {
    const _parts = data.split(':')

    return parseInt(_parts[0]) * 3600 +
      parseInt(_parts[1]) * 60 +
      parseInt(_parts[2])
  }

  // Parses a schedule returned by the outside API
  protected parseScheduleString(data: string) {
    const _parts = data.split(',')

    return {
      nextId: _parts[0],
      schedule: _parts.slice(1).map((v) => this.timeStringToNumber(v))
    }
  }

  protected parseStationSchedule(
    data: IMetroApiStation,
    type: ISubwayScheduleType
  ): ISubwayStationSchedule[] {
    const prefixes = ['prev', 'next']
    const selector = type == 'normal' ? 'workday' : type

    const schedules = prefixes
      .map((prefix) => data[`${prefix}_station_schedule_${selector}`])
      .filter((v) => v.length > 0)

    return schedules.map((v) => ({
      id: data.id,
      duration: 0,
      ...this.parseScheduleString(v)
    }))
  }

  protected populateStationScheduleDuration(data: ISubwayStationSchedule[]): ISubwayStationSchedule[] {
    const cache: { [key: string]: number } = {}

    const getCacheId = (id: string, nextId: string) => {
      return id.localeCompare(nextId) > 0 ?
        `${id}:${nextId}` : `${nextId}:${id}`
    }

    for (const item of data) {
      const cacheId = getCacheId(item.id, item.nextId)

      if (cache[cacheId]) {
        item.duration = cache[cacheId]
      }
      else {
        const nextItems = data.filter((v) => v.id === item.nextId && v.nextId !== item.id)

        if (nextItems.length !== 1) {
          item.duration = -1
        } else {
          const departure = item.schedule[0]
          const arrival = nextItems[0].schedule.find((v) => v > departure)!
          const duration = arrival - departure

          item.duration = duration
          cache[cacheId] = duration
        }
      }
    }

    for (const item of data) {
      if (item.duration === -1) {
        const cacheId = getCacheId(item.id, item.nextId)
        item.duration = cache[cacheId]
      }
    }

    return data
  }

  public async getData(): Promise<ISubwayData> {
    const response = await axios.get('http://metro.witharts.kz/metro/api/0/all')

    const data: IMetroApiResponse = response.data

    const stations: ISubwayStation[] = data.stations
      .sort((a, b) => a.station_order.localeCompare(b.station_order))
      .map((v) => ({
        id: v.id,
        name: {
          kk: v.name_kaz,
          ru: v.name,
          en: v.name_eng,
        },
        position: {
          latitude: parseFloat(v.latitude),
          longitude: parseFloat(v.longitude),
        }
      }))

    const scheduleKeys: ISubwayScheduleType[] = ['normal', 'holiday']
    const scheduleValues = scheduleKeys.map(
      (schedule) => this.populateStationScheduleDuration(
        data.stations
          .map((v) => this.parseStationSchedule(v, schedule))
          .reduce((prev, next) => prev.concat(next), [])
      )
    )

    // A hard-coded value, since the subway has only one line.
    const line: ISubwayLine = {
      id: '0',
      name: 'default',
      stations: stations.map((v) => v.id),
      schedules: scheduleKeys.reduce((obj, k, i) =>
        ({ ...obj, [k]: scheduleValues[i] }),
        {} as ISubwayLineSchedule,
      ),
    }

    const events: ISubwayScheduleEvent[] = data.holidays.map((v) => ({
      name: v.name,
      date: new Date(v.date),
      type: 'holiday',
    }))

    return {
      lines: { [line.id]: line },
      stations: stations.reduce((obj, value) => ({ ...obj, [value.id]: value }), {}),
      events,
    }
  }

  async getOriginal(): Promise<any> {
    const response = await axios.get('http://metro.witharts.kz/metro/api/0/all', {
      headers: {
        'X-Requested-With': 'com.witharts.metro',
      },
    })

    return response.data
  }
}