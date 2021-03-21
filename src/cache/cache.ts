import { promises as fs } from 'fs'
import fsExtra from 'fs-extra'

export class ApiCache<T> {
  private path: string
  private _currentValue?: T

  constructor(path: string) {
    this.path = path
    fsExtra.ensureFileSync(this.path)
  }

  async tryLoadFromCache(): Promise<T | null> {
    const buffer = await fs.readFile(this.path)

    if (buffer.byteLength === 0) {
      return null
    }

    const value = JSON.parse(buffer.toString()) as T
    this._currentValue = value

    return value
  }

  async saveToCache(value: T): Promise<void> {
    this._currentValue = value
    return fs.writeFile(this.path, JSON.stringify(value))
  }

  public get currentValue(): T | undefined {
    return this._currentValue
  }
}