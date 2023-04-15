import { 
    ApplicationCommandRegistry, 
    Command
} from '@sapphire/framework';
import { EmbedBuilder, PermissionsBitField, Colors, DiscordAPIError, GuildMemberRoleManager, GuildMember, PermissionFlagsBits, AutocompleteInteraction } from 'discord.js';
import { DatabaseError } from 'pg';
import { bgBlackBright, bgRedBright, bold } from 'colorette';
import { ApplyOptions } from '@sapphire/decorators';

@ApplyOptions<Command.Options>({
    requiredClientPermissions: [
        PermissionFlagsBits.ManageRoles,
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
                .setName('approve')
                .setDescription('Aprueba a los usuarios que seleccionas')
                .setDefaultMemberPermissions(
                    PermissionsBitField.Flags.ManageGuild  
                )
                .setDMPermission(false)
                .addUserOption(option => 
                    option
                        .setName('member')
                        .setDescription('Selecciona a un usuario')
                        .setRequired(true)
                )
                .addIntegerOption(option => 
                    option
                        .setName('modal')
                        .setDescription('Selecciona un modal')
                        .setMinValue(1000)
                        .setRequired(true)
                        .setAutocomplete(true)
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
                WHERE guildID = $1 AND category = 'S'
            `, [interaction.guildId]);
            
            let member = interaction.options.getMember('member') as GuildMember;
            const roleIDS = staff_roles.rows.map(value => value.roleid);

            if(member.roles.valueOf().hasAny(...roleIDS))
                return await interaction.editReply({
                    content: 'No puedes usar este comando porque no eres el support del server'
                });
            
            const roles = await this.container.sql.query(`
                SELECT
                roleID,
                category
                FROM ModalRoles MR
                INNER JOIN Modals M
                    ON M.modalID = MR.modalID
                WHERE M.guildID = $1 AND MR.modalID = $2
            `, [interaction.guildId, interaction.options.getInteger('modal')]);
    
            if(!roles.rowCount){
                return await interaction.editReply({
                    content: 'No existe este modal, porfavor ingrese un modal valido'
                });
            }

            member = await member.roles.add(
                roles.rows
                    .filter(value => value.category === 'G')
                    .map(value => value.roleid)
            );
            
            await member.roles.remove(
                roles.rows
                    .filter(value => value.category === 'R')
                    .map(value => value.roleid)
            );

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                    .setTitle('Aceptado ✅')
                    .setDescription(`El usuario ${member.user.toString()} fue aceptado`)
                    .setColor(Colors.Green)
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
                        break;
                }
            }
        }
    }

    public async autocompleteRun(interaction: AutocompleteInteraction){
        try{
            const focus = interaction.options.getFocused() + "%";
            const result = await this.container.sql.query(`
                SELECT 
                title as "name",
                modalID as "value"
                FROM Modals
                WHERE guildID=$1 AND title LIKE $2
                ORDER BY title ASC
                LIMIT 25
            `, [interaction.guildId, focus + "%"]);

            interaction.respond(result.rows)
        }catch(e){
            if(e instanceof DiscordAPIError)
                this.container.logger.error(`${bgRedBright(bold(` ${e.code}〡${this.name}〡autocompleteRun `))}〣${e.message} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
            interaction.respond([]);
        }
    }

}