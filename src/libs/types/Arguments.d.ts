import { ArrayString, IntegerString } from "@skyra/env-utilities";
import { Pool } from "pg";

declare module '@skyra/env-utilities' {
	interface Env {
        DISCORD_TOKEN: string;
		SQL_DATABASE: string;
		SQL_HOST: string;
		SQL_PASSWORD: string;
		SQL_PORT: IntegerString;
		SQL_USER: string;
	}
}

declare module '@sapphire/pieces' {	
	interface Container {
		sql: Pool
        music: Kazagumo;
	}
}