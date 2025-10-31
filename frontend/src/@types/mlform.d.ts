declare module 'mlform/strategies' {
    export class BooleanStrategy { }
    export class CategoryStrategy { }
    export class ClassifierStrategy { }
    export class DateStrategy { }
    export class NumberStrategy { }
    export class RegressorStrategy { }
    export class TextStrategy { }
}

declare module 'mlform' {
    export class MLForm {
        constructor(apiUrl: string);
        register(strategy: any): void;
        schema(): any;
        validateSchema(data: any): any;
        toHTMLElement(schema: any, container: HTMLElement): void;
        onSubmit(callback: (inputs: Record<string, object>, response: Record<string, object>) => void): () => void;
    }
}