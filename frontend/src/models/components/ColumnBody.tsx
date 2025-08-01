import type { Model, Prediction, Signature } from "../hooks";

type ColumnBodyProps = {
    items: Model[] | Signature[] | Prediction[];
    selectedItemId: string | null;
    onItemSelect: (itemId: string) => void;
    cardComponent: React.ComponentType<{ item: any; index: number, selectedItemId: string | null; onItemSelect: (itemId: string) => void }>;
}

export function ColumnBody({ items, selectedItemId, onItemSelect, cardComponent: CardComponent }: ColumnBodyProps) {
    return (
        <div className="flex flex-col flex-1 overflow-y-auto min-h-0 gap-3 p-4 ">
            {items.map((item, index) => (
                <CardComponent
                    key={item.id + - + index}
                    item={item}
                    index={index}
                    selectedItemId={selectedItemId}
                    onItemSelect={onItemSelect}
                />
            ))}
        </div>
    );
}