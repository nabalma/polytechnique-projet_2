import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { GameObject, gameOjectObSchema, Tile, tileSchema } from './grid-content';

@Schema({ _id: false })
export class Cell {

    @Prop({
        required: true,
        type: tileSchema,
    })
    tile: Tile;

    @Prop({
        required: false,
        type: gameOjectObSchema,
    })
    objects?: GameObject;
}

export const cellSchema = SchemaFactory.createForClass(Cell);