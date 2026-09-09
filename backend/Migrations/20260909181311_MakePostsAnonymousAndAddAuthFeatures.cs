using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GossipCupula.Api.Migrations
{
    /// <inheritdoc />
    public partial class MakePostsAnonymousAndAddAuthFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Posts_Users_OwnerId",
                table: "Posts");

            migrationBuilder.DropIndex(
                name: "IX_Posts_OwnerId",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "IsAnonymous",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "OwnerId",
                table: "Posts");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsAnonymous",
                table: "Posts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "OwnerId",
                table: "Posts",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Posts_OwnerId",
                table: "Posts",
                column: "OwnerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Posts_Users_OwnerId",
                table: "Posts",
                column: "OwnerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
