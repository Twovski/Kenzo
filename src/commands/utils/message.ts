import { ApplyOptions } from '@sapphire/decorators';
import { 
    ApplicationCommandRegistry, 
    Command
} from '@sapphire/framework';
import { Time } from '@sapphire/time-utilities';
import { bgBlackBright, bgRedBright, bold } from 'colorette';
import { EmbedBuilder, PermissionsBitField, Colors, ChannelType, TextChannel, codeBlock, ModalBuilder, TextInputBuilder, TextInputStyle, ComponentType, InteractionResponse, InteractionResponseType, DiscordAPIError, PermissionFlagsBits } from 'discord.js';
import { DatabaseError } from 'pg';

@ApplyOptions<Command.Options>({
    requiredClientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ViewChannel
    ]
})

export class Message extends Command {
    public registerApplicationCommands(registry: ApplicationCommandRegistry){
        registry.registerChatInputCommand(builder => 
            builder
                .setName('message')
                .setDescription('Apartado de mensajes')
                .setDefaultMemberPermissions(
                    PermissionsBitField.Flags.ManageGuild | 
                    PermissionsBitField.Flags.SendMessages
                )
                .setDMPermission(false)
                .addSubcommand(option => 
                    option
                        .setName('send')
                        .setDescription('Envia un mensaje')
                        .addStringOption(option => 
                            option
                                .setName('content')
                                .setDescription('Escriba lo que mas le gusta')
                                .setMinLength(1)
                                .setMaxLength(4000)
                                .setRequired(true)
                        )
                        .addChannelOption(option => 
                            option
                                .addChannelTypes(ChannelType.GuildText)
                                .setName('channel')
                                .setDescription('Ingrese un canal')
                                .setRequired(true)
                        )   
                )
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction){
        try{
            await interaction.deferReply({
                ephemeral: true
            });

            const channel = interaction.options.getChannel('channel') as TextChannel;
            const message = await channel.send({
                content: interaction.options.getString('content')
            });
            
            await this.container.sql.query(`
                INSERT INTO Messages
                VALUES
                ($1, $2, $3);
            `, [message.id, channel.id, message.guildId]);

            interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Completado ✅')
                        .setDescription(`Mesaje enviado en ${channel.toString()}!`)
                        .setColor(Colors.Green)
                ]
            })
        }catch(e){
            if(e instanceof DatabaseError){
                this.container.logger.error(`${bgRedBright(bold(` ${e.code}〡${this.name} `))}〣${e.message} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
                return await interaction.editReply({
                    content: e.message
                });
            }
            else if(e instanceof DiscordAPIError)
                this.container.logger.error(`${bgRedBright(bold(` ${e.code}〡${this.name} `))}〣${e.message} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
            
            this.container.logger.fatal(`${bgRedBright(bold(` ${this.name} `))}〣${e.toString()} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
        }
    }

}