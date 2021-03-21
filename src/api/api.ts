import { ISubwayData } from "./model";

export abstract class Api {
  public abstract getData(): Promise<ISubwayData>
}
