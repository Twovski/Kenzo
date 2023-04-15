import { 
    ApplicationCommandRegistry, 
    Command
} from '@sapphire/framework';
import { setTimeout } from "timers/promises";
import { EmbedBuilder, PermissionsBitField, Colors, DiscordAPIError, GuildMemberRoleManager, GuildMember, PermissionFlagsBits } from 'discord.js';
import { DatabaseError } from 'pg';
import { bgBlackBright, bgRedBright, bold } from 'colorette';
import { ApplyOptions } from '@sapphire/decorators';

@ApplyOptions<Command.Options>({
    requiredClientPermissions: [
        PermissionFlagsBits.KickMembers,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory
    ]
})

export class Approve extends Command {
    public registerApplicationCommands(registry: ApplicationCommandRegistry){
        registry.registerChatInputCommand(builder => 
            builder
                .setName('deny')
                .setDescription('Deniega a los usuarios del server')
                .setDefaultMemberPermissions(
                    PermissionsBitField.Flags.ManageGuild |
                    PermissionsBitField.Flags.KickMembers
                )
                .setDMPermission(false)
                .addUserOption(option => 
                    option
                        .setName('member')
                        .setDescription('Selecciona a un usuario')
                        .setRequired(true)
                )
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction){
        try{
            await interaction.deferReply();
    
            const staff_roles = await this.container.sql.query(`
                SELECT
                roleID
                FROM Roles
                WHERE guildID = $1
            `, [interaction.guildId]);
            
            const member = interaction.options.getMember('member') as GuildMember;
            const role_member = member.roles as GuildMemberRoleManager;
            if(role_member.valueOf().some(role => staff_roles.rows.includes(role.id)))
                return await interaction.editReply({
                    content: 'No puedes usar este comando'
                });

            await member.kick();
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                    .setTitle('Usuario denegado ❌')
                    .setDescription(`El usuario ${member.user.toString()} fue aceptado`)
                    .setColor(Colors.Red)
                ]
            });
        }catch(e){
            if(e instanceof DatabaseError)
                this.container.logger.error(`${bgRedBright(bold(` ${e.code}〡${this.name} `))}〣${e.message} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
            else if(e instanceof DiscordAPIError){
                switch(e.code){
                    case 50013:
                        await interaction.editReply({
                            content: `Necesito que mi rol este en la jerarquia superior para poder dar el rol`
                        });
                        break;
                    default:
                        this.container.logger.error(`${bgRedBright(bold(` ${e.code}〡${this.name} `))}〣${e.message} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
                        await interaction.editReply({
                            content: `Ocurrio un error interno, vuelve a intentarlo`
                        });
                        break;
                }
            }
        }
    }

}