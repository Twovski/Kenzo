import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Command } from '@sapphire/framework';
import { bgBlackBright, bgRedBright, bold } from 'colorette';
import { ChannelType, Colors, DiscordAPIError, EmbedBuilder, PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { DatabaseError } from 'pg';

@ApplyOptions<Command.Options>({
    requiredClientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ManageChannels
    ]
})

export class Channel extends Command {
    public registerApplicationCommands(registry: ApplicationCommandRegistry){
        registry.registerChatInputCommand(builder => 
            builder
                .setName('channel')
                .setDescription('Un apartado para guardar los canales')
                .setDefaultMemberPermissions(
                    PermissionsBitField.Flags.ManageGuild
                )
                .setDMPermission(false)
                .addChannelOption(option => 
                    option
                        .addChannelTypes(ChannelType.GuildText)
                        .setName('channel')
                        .setDescription('Ingrese un canal')
                        .setRequired(true)
                )   
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction){
        try{
            await interaction.deferReply({
                ephemeral: true
            });
            const channel = interaction.options.getChannel('channel');
            await this.container.sql.query(`
                UPDATE Guilds
                SET channelID=$1
                WHERE guildID=$2
            `, [channel.id, interaction.guildId]);

            await interaction.editReply({
                embeds: [ 
                    new EmbedBuilder()
                        .setTitle('Completado ✅')
                        .setDescription(`${channel.toString()} establecido como un canal de formularios`)
                        .setColor(Colors.Green)
                ]
            });
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