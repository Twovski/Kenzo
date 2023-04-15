import { 
    ApplicationCommandRegistry, 
    Command
} from '@sapphire/framework';
import { PermissionsBitField, TextChannel, TextInputStyle, ComponentType, DiscordAPIError, PermissionFlagsBits } from 'discord.js';
import { DatabaseError } from 'pg';
import { bgBlackBright, bgRedBright, bold } from 'colorette';
import { ApplyOptions } from '@sapphire/decorators';

@ApplyOptions<Command.Options>({
    requiredClientPermissions: [
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory
    ]
})

export class Edit extends Command {
    public registerApplicationCommands(registry: ApplicationCommandRegistry){
        registry.registerChatInputCommand(builder => 
            builder
                .setName('edit')
                .setDescription('Edita los mensajes hechos por mi')
                .setDefaultMemberPermissions(
                    PermissionsBitField.Flags.ManageGuild |
                    PermissionsBitField.Flags.ManageMessages
                )
                .setDMPermission(false)
                .addStringOption(option => 
                    option
                        .setName('message_id')
                        .setDescription('ID del mensaje')
                        .setRequired(true)
                )
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction){
        try{
            const result = await this.container.sql.query(`
                CALL SP_GetChannel($1, $2, $3)
            `, [interaction.options.getString('message_id'), interaction.guildId, null])

            const channel = await interaction.client.channels.fetch(result.rows[0].idchannel) as TextChannel;
            const message = await channel.messages.fetch(interaction.options.getString('message_id'));

            console.log(JSON.stringify(message.embeds[0], null, 3))
            await interaction.showModal({
                custom_id: 'EditMessage',
                title: 'Editor',
                components: [{
                    type: ComponentType.ActionRow,
                    components: [{
                        custom_id: `${channel.id}:${message.id}`,
                        type: ComponentType.TextInput,
                        label: 'Contenido del mensaje',
                        style: TextInputStyle.Paragraph,
                        value: message.content.length ? message.content : JSON.stringify(message.embeds[0], null, 3),
                        min_length: 1,
                        placeholder: 'Escribe algo en el mensaje'
                    }]
                }]
            });
        }catch(e){
            if(e instanceof DatabaseError){
                this.container.logger.error(`${bgRedBright(bold(` ${e.code}〡${this.name} `))}〣${e.message} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
                return await interaction.reply({
                    content: e.message,
                    ephemeral: true
                });
            }
            else if(e instanceof DiscordAPIError)
                return this.container.logger.error(`${bgRedBright(bold(` ${e.code}〡${this.name} `))}〣${e.message} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
            
            this.container.logger.fatal(`${bgRedBright(bold(` ${this.name} `))}〣${e.toString()} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
        }
    }

}