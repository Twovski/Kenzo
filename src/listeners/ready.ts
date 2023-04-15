import { LoggerStyle, LoggerStyleBackground } from '@sapphire/plugin-logger'
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { ActivityType, Client, Guild, Message } from 'discord.js';

@ApplyOptions<Listener.Options>({
    event: Events.ClientReady
})

export class GuildCreateListener extends Listener{
    public async run(client: Client<true>) {
        //client.application.commands.set([])
    }
    
    
}