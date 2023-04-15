import { LoggerStyle, LoggerStyleBackground } from '@sapphire/plugin-logger'
import { ApplyOptions } from '@sapphire/decorators';
import { ChatInputCommandDeniedPayload, Events, Listener, UserError, err } from '@sapphire/framework';
import { ActivityType, Client, Guild, Message } from 'discord.js';
import permissions from '#assets/permissions.json';

@ApplyOptions<Listener.Options>({
    event: Events.ChatInputCommandDenied
})

export class GuildCreateListener extends Listener<typeof Events.ChatInputCommandDenied>{
    run(error: UserError, payload: ChatInputCommandDeniedPayload) {
        const context = error.context as CommandContextDenied;

        const message: IKey<string> = {
            'preconditionCooldown': `Espera ${context.remaining / 1000} para ejecutar ese comando otra vez.`,
            'preconditionUserPermissions': `Te faltan permisos para ejecutar el comando. \nPermisos faltantes: \`${
                context.missing
                    .map(value => permissions[value as keyof typeof permissions])
                    .join(', ')
            }\``,
            'preconditionClientPermissions': `No tengo los permisos para ejecutar el comando. \nPermisos faltantes: \`${
                context.missing
                    .map(value => permissions[value as keyof typeof permissions])
                    .join(', ')
            }\``
        }

        console.log(context.missing)
        if(payload.interaction.deferred)
            return payload.interaction.editReply({
                content: message[error.identifier]
            })
                
        payload.interaction.reply({
            content: message[error.identifier],
            ephemeral: true
        })
    }
    
    
    
}