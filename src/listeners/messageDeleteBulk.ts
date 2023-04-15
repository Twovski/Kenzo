import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { Collection, Guild, Message, PartialMessage, Snowflake } from 'discord.js';

@ApplyOptions<Listener.Options>({
    event: Events.MessageBulkDelete
})

export class MessageBulkDeleteListener extends Listener<typeof Events.MessageBulkDelete>{
    public async run(messages: Collection<Snowflake, Message>) {
        await this.container.sql.query(`
            DELETE FROM Messages
            WHERE messageID IN ($2) AND guildID = $1
        `, [messages.first().guildId, messages.map(value => value.id).join(", ")]);
    }
    
}