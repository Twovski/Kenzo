import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { Guild, Message, PartialMessage } from 'discord.js';

@ApplyOptions<Listener.Options>({
    event: Events.MessageDelete
})

export class MessageDeleteListener extends Listener<typeof Events.MessageDelete>{
    public async run(message: Message<boolean> | PartialMessage) {
        await this.container.sql.query(`
           DELETE FROM Messages
           WHERE messageID = $2 AND guildID = $1
        `, [message.guildId, message.id]);
    }
    
    
}