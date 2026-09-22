using GossipCupula.Api.DTOs.Auth;
using GossipCupula.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace GossipCupula.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto registerDto)
    {
        try
        {
            var response = await _authService.RegisterAsync(registerDto);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            // E-mail ou nome de usuário já cadastrado.
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto loginDto)
    {
        try
        {
            var response = await _authService.LoginAsync(loginDto);
            return Ok(response);
        }
        catch (UnauthorizedAccessException)
        {
            // Atualizado para incluir "Usuário"
            return Unauthorized(new { message = "Usuário/e-mail ou senha inválidos." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Confirma o e-mail de um usuário (passo 1 da validação de cadastro).
    /// </summary>
    [HttpPost("confirm-email")]
    public async Task<IActionResult> ConfirmEmail([FromBody] ConfirmEmailDto confirmEmailDto)
    {
        var confirmed = await _authService.ConfirmEmailAsync(confirmEmailDto.Email);
        if (!confirmed)
        {
            return NotFound();
        }

        return Ok(new { message = "E-mail confirmado com sucesso." });
    }

    /// <summary>
    /// Troca um par de tokens expirado por um novo par usando o refresh token.
    /// </summary>
    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponseDto>> Refresh([FromBody] RefreshTokenDto refreshTokenDto)
    {
        try
        {
            var response = await _authService.RefreshTokenAsync(refreshTokenDto);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            // Refresh token inválido ou expirado.
            return Unauthorized(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Verifica se o token atual é válido e retorna os dados de sessão do usuário.
    /// </summary>
    [HttpGet("authorized")]
    [Authorize]
    public IActionResult CheckAuthorized()
    {
        // Extrai o ID e a Role diretamente do token JWT decodificado
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        return Ok(new 
        { 
            userId = userId,
            isAdmin = role == "Admin" 
        });
    }
}
