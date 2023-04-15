import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { Guild, Message, Role } from 'discord.js';

@ApplyOptions<Listener.Options>({
    event: Events.GuildRoleDelete
})

export class GuildCreateListener extends Listener{
    public async run(role: Role) {
        await this.container.sql.query(`
            DELETE FROM Roles
            WHERE roleID = $1 AND guildID = $2
        `, [role.id, role.guild.id]);
    }
    
    
}