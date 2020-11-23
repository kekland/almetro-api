import axios from 'axios'
import { Holiday, SubwayData, SubwaySchedule, SubwayStation, SubwayStationDepartures } from '../data/model'

export abstract class SubwayApi {
  abstract fetchData: () => Promise<SubwayData>
}

interface JsonSubwayResponse {
  stations: Array<{
    id: string,
    station_id: string,
    name: string,
    name_eng: string,
    name_kaz: string,
    latitude: string,
    longitude: string,
    station_order: string,
    next_station_schedule_workday: string,
    prev_station_schedule_workday: string,
    next_station_schedule_holiday: string,
    prev_station_schedule_holiday: string,
  }>,
  holidays: Array<{
    name: string,
    date: string,
    type: string,
  }>,
}

export class JsonSubwayApi implements SubwayApi {
  url: string = 'http://metro.witharts.kz/metro/api/0/all'

  async fetchData(): Promise<SubwayData> {
    const response = await axios.get(this.url)

    if (response.status === 200) {
      const data = response.data as JsonSubwayResponse

      const stations: SubwayStation[] = data.stations.map((v) => ({
        id: v.id,
        order: parseInt(v.station_order),
        name: {
          name_ru: v.name,
          name_en: v.name_eng,
          name_kz: v.name_kaz,
        },
        position: {
          latitude: parseFloat(v.latitude),
          longitude: parseFloat(v.longitude),
        },
      }))

      const getSchedule = (schedule: string): SubwayStationDepartures => {
        const split = schedule.split(',')

        return {
          to: split[0],
          schedule: split.slice(1),
        }
      }

      const getSubwaySchedule = (suffix: 'workday' | 'holiday'): SubwaySchedule => {
        const map: SubwaySchedule = {}

        for (const station of data.stations) {
          const nextStationSchedule = suffix === 'workday' ?
            station.next_station_schedule_workday :
            station.next_station_schedule_holiday

          const prevStationSchedule = suffix === 'workday' ?
            station.prev_station_schedule_workday :
            station.prev_station_schedule_holiday

          const data = [getSchedule(nextStationSchedule), getSchedule(prevStationSchedule)]
          map[station.id] = data
        }

        return map
      }

      const schedules = {
        normal: getSubwaySchedule('workday'),
        holiday: getSubwaySchedule('holiday'),
      }

      const holidays: Holiday[] = data.holidays.map((v) => ({
        name: v.name,
        date: new Date(v.date),
      }))

      return {
        stations: stations.sort((a, b) => a.order - b.order),
        schedules,
        holidays,
      }
    }
    else {
      throw response.data
    }
  }
}