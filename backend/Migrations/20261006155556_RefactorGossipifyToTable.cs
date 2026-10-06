using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GossipCupula.Api.Migrations
{
    /// <inheritdoc />
    public partial class RefactorGossipifyToTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsGossipfyed",
                table: "Posts");

            migrationBuilder.AddColumn<Guid>(
                name: "GossipifiedPostId",
                table: "Posts",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "GossipifiedPosts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GossipifiedPosts", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Posts_GossipifiedPostId",
                table: "Posts",
                column: "GossipifiedPostId");

            migrationBuilder.AddForeignKey(
                name: "FK_Posts_GossipifiedPosts_GossipifiedPostId",
                table: "Posts",
                column: "GossipifiedPostId",
                principalTable: "GossipifiedPosts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Posts_GossipifiedPosts_GossipifiedPostId",
                table: "Posts");

            migrationBuilder.DropTable(
                name: "GossipifiedPosts");

            migrationBuilder.DropIndex(
                name: "IX_Posts_GossipifiedPostId",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "GossipifiedPostId",
                table: "Posts");

            migrationBuilder.AddColumn<bool>(
                name: "IsGossipfyed",
                table: "Posts",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }
    }
}
