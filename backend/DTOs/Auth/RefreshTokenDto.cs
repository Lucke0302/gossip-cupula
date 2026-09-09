using System.ComponentModel.DataAnnotations;

namespace GossipCupula.Api.DTOs.Auth;

/// <summary>
/// DTO usado para renovar o par de tokens via POST /api/auth/refresh.
/// </summary>
public class RefreshTokenDto
{
    [Required(ErrorMessage = "O access token é obrigatório.")]
    public string AccessToken { get; set; } = string.Empty;

    [Required(ErrorMessage = "O refresh token é obrigatório.")]
    public string RefreshToken { get; set; } = string.Empty;
}
