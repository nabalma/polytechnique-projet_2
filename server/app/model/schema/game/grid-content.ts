import { ObjectType, TileType } from '@common/enum/game/grid/game-grid.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Tile {
    @Prop({
        type: String,
        enum: Object.values(TileType),
        required: true,
    })
    tileType: TileType;

    @Prop({ required: true })
    imageSrc: string;
}


@Schema({ _id: false })
export class GameObject {

    @Prop({
        type: String,
        enum: Object.values(ObjectType),
        required: true,
    })
    objectType: ObjectType;

    @Prop({
        required: true,
    })
    nbCells: number;

    @Prop({
        required: true,
    })
    imageSrc: string;
}

export const tileSchema = SchemaFactory.createForClass(Tile);
export const gameOjectObSchema = SchemaFactory.createForClass(GameObject);