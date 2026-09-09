using System.ComponentModel.DataAnnotations;

namespace GossipCupula.Api.DTOs.Posts;

/// <summary>
/// DTO de entrada para a edição do conteúdo de um post existente.
/// </summary>
public class UpdatePostDto
{
    [Required(ErrorMessage = "O conteúdo é obrigatório.")]
    public string Content { get; set; } = string.Empty;
}
