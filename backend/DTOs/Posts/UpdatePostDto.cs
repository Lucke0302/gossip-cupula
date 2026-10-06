using System.ComponentModel.DataAnnotations;

namespace GossipCupula.Api.DTOs.Posts;

/// <summary>
/// DTO de entrada para a edição do conteúdo de um post existente.
/// </summary>
public class UpdatePostDto
{
    [Required(ErrorMessage = "O conteúdo é obrigatório.")]
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// FK opcional para o registro de gossipficação (IA). É anulável de
    /// propósito: quando ausente (<c>null</c>) a referência existente é
    /// preservada, e não apagada — assim uma edição de conteúdo não
    /// "des-gossipifica" um post por acidente.
    /// </summary>
    public Guid? GossipifiedPostId { get; set; }
}
