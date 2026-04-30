import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Grid, gridSchema } from './grid';

export type GameDocument = HydratedDocument<Game>;

export const FIELDS_FOR_MATCH = 'grid';

@Schema({ collection: 'games', timestamps: true })
export class Game {

    @Prop({ required: true })
    name: string;

    @Prop({ required: false })
    imageUrl?: string;

    @Prop({ required: true })
    description: string;

    @Prop({ required: true })
    mode: string;

    @Prop({
        type: gridSchema,
        required: true,
    })
    grid: Grid;

    @Prop({
        required: false,
        default: true,
    })
    isVisible: boolean;
}

export const gameSchema = SchemaFactory.createForClass(Game);