import { ApplyOptions } from '@sapphire/decorators';
import { 
    ApplicationCommandRegistry, 
    Command
} from '@sapphire/framework';
import { bgBlackBright, bgRedBright, bold } from 'colorette';
import { EmbedBuilder, PermissionsBitField, Colors, DiscordAPIError, PermissionFlagsBits } from 'discord.js';
import { DatabaseError } from 'pg';

@ApplyOptions<Command.Options>({
    requiredClientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ViewChannel
    ]
})
export class Embed extends Command {
    public registerApplicationCommands(registry: ApplicationCommandRegistry){
        registry.registerChatInputCommand(builder => 
            builder
                .setName('embed')
                .setDescription('Crear un embed usando JSON')
                .setDefaultMemberPermissions(
                    PermissionsBitField.Flags.ManageGuild | 
                    PermissionsBitField.Flags.SendMessages |
                    PermissionsBitField.Flags.EmbedLinks
                )
                .setDMPermission(false)
                .addSubcommand(option => 
                    option
                        .setName('json')
                        .setDescription('Crear un embed usando JSON')
                        .addStringOption(option => 
                            option
                                .setName('content')
                                .setDescription('Embed en formato JSON')
                                .setRequired(true)
                        )
                )
                .addSubcommand(option => 
                    option
                        .setName('builder')
                        .setDescription('Construye tu propio embed')
                )
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction){
        const command = interaction.options.getSubcommand();
        if(command === 'builder')
            return this.embedBuilder(interaction);
        this.embedJSON(interaction);
    }

    private embedBuilder(interaction: Command.ChatInputCommandInteraction){
        interaction.reply("En proceso!");
    }

    private async embedJSON(interaction: Command.ChatInputCommandInteraction){
        try{
            await interaction.deferReply({
                ephemeral: true
            });

            const json = JSON.parse(interaction.options.getString('content'));
            const message = await interaction.channel.send({
                embeds: [ new EmbedBuilder(json) ]
            });
            
            await this.container.sql.query(`
                INSERT INTO Messages
                VALUES
                ($1, $2, $3);
            `, [message.id, message.channelId, message.guildId]);

            interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Completado ✅')
                        .setDescription(`Embed creado!`)
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
            else if(e instanceof DiscordAPIError){
                this.container.logger.error(`${bgRedBright(bold(` ${e.code}〡${this.name} `))}〣${e.message} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
                return await interaction.editReply({
                    content: "JSON no válido.\nPuede usar el creador de embeds usando el comando **/embed**."
                })
            }

            this.container.logger.fatal(`${bgRedBright(bold(` ${this.name} `))}〣${e.toString()} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
        }
    }
}