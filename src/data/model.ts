export interface SubwayData {
  stations: SubwayStation[],
  schedules: {
    normal: SubwaySchedule,
    holiday: SubwaySchedule,
  },
  holidays: Holiday[],
}

export interface SubwayStation {
  id: string,
  order: number,
  name: {
    name_kz: string,
    name_ru: string,
    name_en: string,
  },
  position: {
    latitude: number,
    longitude: number,
  },
}

export type SubwaySchedule = { [key: string]: SubwayStationDepartures[] }

export interface Holiday {
  name: string,
  date: Date,
}

export interface SubwayStationDepartures {
  to: string,
  schedule: string[],
}
