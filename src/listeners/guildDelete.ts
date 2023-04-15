import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { Guild, Message } from 'discord.js';

@ApplyOptions<Listener.Options>({
    event: Events.GuildDelete
})

export class GuildCreateListener extends Listener{
    public async run(guild: Guild) {
        await this.container.sql.query(`
            DELETE FROM Guilds
            WHERE guildID = $1
        `, [guild.id]);
    }
    
}