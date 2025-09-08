import type { ModelDto, PredictionDto, SignatureDto } from "../api/modelService";

type ColumnBodyProps = {
    items: ModelDto[] | SignatureDto[] | PredictionDto[];
    selectedItemId: string | null;
    onItemSelect: (itemId: string) => void;
    cardComponent: React.ComponentType<{ item: any; index: number, selectedItemId: string | null; onItemSelect: (itemId: string) => void }>;
}

export function ColumnBody({ items, selectedItemId, onItemSelect, cardComponent: CardComponent }: ColumnBodyProps) {
    return (
        <div className="flex flex-col flex-1 overflow-y-auto min-h-fit gap-3 p-4 ">
            {items.map((item, index) => (
                <CardComponent
                    key={item.id + "-" + index}
                    item={item}
                    index={index}
                    selectedItemId={selectedItemId}
                    onItemSelect={onItemSelect}
                />
            ))}
        </div>
    );
}