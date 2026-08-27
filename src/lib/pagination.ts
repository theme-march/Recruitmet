import {z} from "zod";
export const paginationSchema=z.object({page:z.coerce.number().int().min(1).default(1),pageSize:z.coerce.number().int().min(10).max(100).default(25),q:z.string().trim().max(120).optional(),sort:z.string().max(50).optional(),order:z.enum(["asc","desc"]).default("desc")});
export function parsePagination(url:string){const search=Object.fromEntries(new URL(url).searchParams);const value=paginationSchema.parse(search);return{...value,skip:(value.page-1)*value.pageSize,take:value.pageSize}}
export function pageResult<T>(data:T[],total:number,page:number,pageSize:number){return{data,meta:{page,pageSize,total,totalPages:Math.max(1,Math.ceil(total/pageSize))}}}
