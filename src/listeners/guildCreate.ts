import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { Guild, Message } from 'discord.js';

@ApplyOptions<Listener.Options>({
    event: Events.GuildCreate
})

export class GuildCreateListener extends Listener{
    public async run(guild: Guild) {
        await this.container.sql.query(`
            INSERT INTO Guilds
            VALUES
            ($1)
        `, [guild.id])
    }
    
}