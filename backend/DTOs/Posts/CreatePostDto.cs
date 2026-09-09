using System.ComponentModel.DataAnnotations;

namespace GossipCupula.Api.DTOs.Posts;

/// <summary>
/// DTO de entrada para a criação de um novo post.
/// Todo post é publicado de forma 100% anônima ("Gossip Girl").
/// </summary>
public class CreatePostDto
{
    [Required(ErrorMessage = "O título é obrigatório.")]
    [StringLength(200, ErrorMessage = "O título deve ter no máximo 200 caracteres.")]
    public string Title { get; set; } = string.Empty;

    [Required(ErrorMessage = "O conteúdo é obrigatório.")]
    public string Content { get; set; } = string.Empty;
}
