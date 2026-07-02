import { Document, Schema as MongooseSchema } from 'mongoose';
export type SettingDocument = Setting & Document;
export declare class Setting {
    key: string;
    value: any;
    updated_at: Date;
    updated_by: string;
}
export declare const SettingSchema: MongooseSchema<Setting, import("mongoose").Model<Setting, any, any, any, Document<unknown, any, Setting, any, {}> & Setting & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Setting, Document<unknown, {}, import("mongoose").FlatRecord<Setting>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Setting> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
