import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { ChannelType, DMChannel, Guild, Message, NonThreadGuildBasedChannel } from 'discord.js';

@ApplyOptions<Listener.Options>({
    event: Events.ChannelDelete
})

export class GuildCreateListener extends Listener{
    public async run(channel: DMChannel | NonThreadGuildBasedChannel) {
        if(!channel.isTextBased())
            return

        if(!(channel.type === ChannelType.GuildText))
            return

        await this.container.sql.query(`
            UPDATE Guilds
            SET channelID = NULL
            WHERE guildID = $1 AND channelID = $2
        `, [channel.guildId, channel.id])
    }
    
    
}