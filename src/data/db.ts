import fs from 'fs'

export class Database<T> {
  private lastCachedData: T | undefined
  private saveFileDirectory: string;

  constructor(saveFileDirectory: string) {
    this.saveFileDirectory = saveFileDirectory
  }

  async setData(value: T): Promise<void> {
    this.lastCachedData = value

    return new Promise<void>((resolve, reject) => {
      fs.writeFile(this.saveFileDirectory, JSON.stringify(value), (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  getLastCachedData(): T {
    if (!this.lastCachedData) throw Error('No cached data')
    return this.lastCachedData
  }

  async fetchCachedData(): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      fs.readFile(this.saveFileDirectory, (err, data) => {
        if (err) return reject(err)
        if (!data) return reject(new Error('No cached data'))
        const obj = JSON.parse(data.toString()) as T
        this.lastCachedData = obj
        resolve(obj)
      })
    })
  }
}