import { DISCORD_OPTIONS } from "#root/config";
import { container, SapphireClient } from "@sapphire/framework";
import { envParseInteger, envParseString } from "@skyra/env-utilities";
import { Pool } from "pg";


export class KenzoClient extends SapphireClient{
    constructor(){
        super(DISCORD_OPTIONS);
        this.initContainer();
    }

    private initContainer(){
        container.sql = new Pool({
            host: envParseString('SQL_HOST'),
            port: envParseInteger('SQL_PORT'),
            user: envParseString('SQL_USER'),
            password: envParseString('SQL_PASSWORD'),
            database: envParseString('SQL_DATABASE')
        });
    }

    public override async login(token: string = envParseString('DISCORD_TOKEN')): Promise<string> {
        const [ result ] = await Promise.all([
            super.login(token)
        ]);
        return result;
    }
}