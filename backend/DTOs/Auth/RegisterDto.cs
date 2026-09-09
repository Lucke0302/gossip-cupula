using System.ComponentModel.DataAnnotations;

namespace GossipCupula.Api.DTOs.Auth;

/// <summary>
/// DTO de entrada para o cadastro (register) de um novo usuário.
/// </summary>
public class RegisterDto
{
    [Required(ErrorMessage = "O nome de usuário é obrigatório.")]
    [StringLength(50, ErrorMessage = "O nome de usuário deve ter no máximo 50 caracteres.")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "O e-mail é obrigatório.")]
    [EmailAddress(ErrorMessage = "Informe um e-mail válido.")]
    [StringLength(256, ErrorMessage = "O e-mail deve ter no máximo 256 caracteres.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "A senha é obrigatória.")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "A senha deve ter entre 6 e 100 caracteres.")]
    public string Password { get; set; } = string.Empty;
}
