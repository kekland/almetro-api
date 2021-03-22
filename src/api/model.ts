// The object returned from the API. Contains everything that is
// needed by the UI to display information about the subway.
export interface ISubwayData {
  stations: { [id: string]: ISubwayStation }
  lines: { [id: string]: ISubwayLine }
  events: ISubwayScheduleEvent[]
}

// Different schedules might affect work-hours or train timings.
export type ISubwayScheduleType = 'normal' | 'holiday'

// An event, for example, a holiday. If the current date is [date], then
// infer the subway's schedule as [type], otherwise use 'normal'.
export interface ISubwayScheduleEvent {
  name: string
  date: Date
  type: ISubwayScheduleType
}

export type ISubwayLineSchedule = {
  [Type in ISubwayScheduleType]: ISubwayStationSchedule[]
}

// A "line" or a "branch" of a subway. Contains an ordered list of stations.
export interface ISubwayLine {
  id: string
  name: string
  stations: string[]
  schedules: ISubwayLineSchedule,
}

// A schedule for a given station. A line can be traversed using
// [lineId] and [nextStationId].
// [schedule] contains the times that a train arrives to the station 
// in seconds since 00:00.
export interface ISubwayStationSchedule {
  id: string
  nextId: string
  duration: number
  schedule: number[]
}

// A single station. It is not bound to any line by default. Contains
// [name], which will always contain at least one language.
// [schedules] will contain every [ISubwayScheduleType]. 
export interface ISubwayStation {
  id: string
  name: {
    [language: string]: string
  }
  position: {
    latitude: number
    longitude: number
  }
}
