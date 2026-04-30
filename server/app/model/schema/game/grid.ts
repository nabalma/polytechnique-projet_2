import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Cell, cellSchema } from './cell';

@Schema({ _id: false })
export class Grid {

    @Prop({
        required: true,
    })
    gridSize: number;

    @Prop({
        type: [[cellSchema]],
        required: true,
    })
    grid: Cell[][];
}
export const gridSchema = SchemaFactory.createForClass(Grid);