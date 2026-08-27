import "server-only";
export type Delivery={recipient:string;title:string;message:string}; export type DeliveryResult={delivered:boolean;reference?:string;error?:string}; export interface NotificationChannel{send(input:Delivery):Promise<DeliveryResult>}
export class InAppChannel implements NotificationChannel{async send(){return{delivered:true,reference:crypto.randomUUID()}}}
export class ConfiguredExternalChannel implements NotificationChannel{constructor(private kind:string){}async send(){return{delivered:false,error:`${this.kind} provider is not configured`}}}
export const channelFor=(name:string):NotificationChannel=>name==="In-app"?new InAppChannel():new ConfiguredExternalChannel(name);
