using System.ComponentModel.DataAnnotations;

namespace GossipCupula.Api.DTOs.Auth;

/// <summary>
/// DTO de entrada para confirmar o e-mail de um usuário recém-cadastrado.
/// </summary>
public class ConfirmEmailDto
{
    [Required(ErrorMessage = "O e-mail é obrigatório.")]
    [EmailAddress(ErrorMessage = "Informe um e-mail válido.")]
    public string Email { get; set; } = string.Empty;
}
