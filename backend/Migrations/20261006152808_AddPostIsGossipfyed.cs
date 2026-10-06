using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GossipCupula.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPostIsGossipfyed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsGossipfyed",
                table: "Posts",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsGossipfyed",
                table: "Posts");
        }
    }
}
