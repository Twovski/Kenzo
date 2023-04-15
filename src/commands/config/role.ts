import { ApplyOptions } from '@sapphire/decorators';
import { 
    ApplicationCommandRegistry, 
    Command
} from '@sapphire/framework';
import { bgBlackBright, bgRedBright, bold } from 'colorette';
import { codeBlock, Colors, DiscordAPIError, EmbedBuilder, PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { DatabaseError } from 'pg';

@ApplyOptions<Command.Options>({
    requiredClientPermissions: [
        PermissionFlagsBits.ManageRoles,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ViewChannel
    ]
})

export class Roles extends Command {
    public registerApplicationCommands(registry: ApplicationCommandRegistry){
        registry.registerChatInputCommand(builder => 
            builder
                .setName('role')
                .setDescription('Apartado para entregar roles a los usuarios')
                .setDMPermission(false)
                .setDefaultMemberPermissions(
                    PermissionsBitField.Flags.ManageGuild
                )
                .addSubcommand(option => 
                    option
                        .setName('add')
                        .setDescription('Dar rol a los nuevos usuarios')
                        .addRoleOption(option => 
                            option
                                .setName('role')
                                .setDescription('Ingrese el role')  
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName('category')
                                .setDescription('Elige la catergoria que pertenece este rol')
                                .setChoices(
                                    {name: 'Support', value: 'S'},
                                    {name: 'User', value: 'U'},
                                )
                                .setRequired(true)
                        )
                )
                .addSubcommand(option => 
                    option
                        .setName('delete')
                        .setDescription('Quitar el rol')
                        .addRoleOption(option => 
                            option
                                .setName('role')
                                .setDescription('Ingrese el role')  
                                .setRequired(true)
                        )
                )
        );
    }

    public chatInputRun(interaction: Command.ChatInputCommandInteraction){
        const command = interaction.options.getSubcommand(true);
        if(command === 'add')
            return this.roleAdd(interaction);
        
        this.roleRemove(interaction);
    }


    private async roleAdd(interaction: Command.ChatInputCommandInteraction){
        try{
            await interaction.deferReply({
                ephemeral: true
            });
            const role = interaction.options.getRole('role');
            await this.container.sql.query(`
                CALL SP_IRole($1, $2, $3)
            `, [
                role.id, 
                interaction.guildId, 
                interaction.options.getString('category')
            ]);

            await interaction.editReply({
                embeds: [ 
                    new EmbedBuilder()
                        .setTitle('Completado ✅')
                        .setDescription(`${role.toString()} fue agregado`)
                        .setColor(Colors.Green)
                ]
            });
        }catch(e){
            if(e instanceof DatabaseError)
                return await interaction.editReply({
                    content: e.message
                });
                
            await interaction.editReply({
                embeds: [ 
                    new EmbedBuilder()
                        .setTitle('📛 Error')
                        .setDescription('Avisa al creador para que me pueda arreglar!')
                        .setFields({
                            name: 'Mensaje',
                            value: codeBlock(e.toString())
                        })
                        .setColor(Colors.Red)
                ]
            });
        }
    }

    private async roleRemove(interaction: Command.ChatInputCommandInteraction){
        try{
            await interaction.deferReply({
                ephemeral: true
            });
            const role = interaction.options.getRole('role');
            await this.container.sql.query(`
                CALL SP_DRole($1, $2)
            `, [role.id, interaction.guildId]);

            await interaction.editReply({
                embeds: [ 
                    new EmbedBuilder()
                        .setTitle('Completado ✅')
                        .setDescription(`${role.toString()} fue removido`)
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