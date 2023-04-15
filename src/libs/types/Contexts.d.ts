interface CommandContextDenied{
    remaining: number
    missing: Array<string>
}

interface IKey<T> {
    [key: string]: T
}