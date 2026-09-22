using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using GossipCupula.Api.Data;
using GossipCupula.Api.DTOs.Admin;
using GossipCupula.Api.DTOs.Auth;
using GossipCupula.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace GossipCupula.Api.Services;

/// <summary>
/// Implementa o cadastro e o login de usuários, validação de conta (e-mail
/// confirmado + aprovação de admin), geração de JWT e refresh tokens.
/// </summary>
public class AuthService(
    AppDbContext dbContext,
    IPasswordHasher<User> passwordHasher,
    IConfiguration configuration) : IAuthService
{
    /// <summary>
    /// Validade do refresh token (em dias) após a emissão/rotação.
    /// </summary>
    private const int RefreshTokenExpirationDays = 7;
    public async Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto)
    {
        var username = registerDto.Username.Trim();
        var email = registerDto.Email.Trim().ToLowerInvariant();

        if (username.Contains(' '))
        {
            throw new InvalidOperationException("O nome de usuário deve ser único e não pode conter espaços.");
        }

        if (await dbContext.Users.AnyAsync(u => u.Email == email))
        {
            throw new InvalidOperationException("Já existe um usuário cadastrado com este e-mail.");
        }

        if (await dbContext.Users.AnyAsync(u => u.Username == username))
        {
            throw new InvalidOperationException("Já existe um usuário cadastrado com este nome de usuário.");
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = username,
            Email = email,
            Role = "User",
            CreatedAt = DateTime.UtcNow
        };

        // Gera o hash da senha de forma segura (PBKDF2 com salt aleatório).
        user.PasswordHash = passwordHasher.HashPassword(user, registerDto.Password);

        // Novo usuário já recebe um par de tokens para uso após as aprovações.
        SetRefreshToken(user);

        dbContext.Users.Add(user);

        try
        {
            await dbContext.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Corrida entre dois registers simultâneos: os índices únicos de
            // Username/Email barram a duplicidade no banco.
            throw new InvalidOperationException("Já existe um usuário cadastrado com este e-mail ou nome de usuário.");
        }

        return GenerateToken(user);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto loginDto)
{
    var identifier = loginDto.Identifier.Trim().ToLowerInvariant();

    // Busca o usuário comparando o identificador com o Email ou com o Username
    var user = await dbContext.Users.FirstOrDefaultAsync(u => 
        u.Email == identifier || u.Username.ToLower() == identifier)
        ?? throw new UnauthorizedAccessException("Usuário, e-mail ou senha inválidos.");

    var result = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, loginDto.Password);
        if (result == PasswordVerificationResult.Failed)
        {
            throw new UnauthorizedAccessException("E-mail ou senha inválidos.");
        }

        // Validação de cadastro: exige e-mail confirmado e aprovação de admin.
        if (!user.IsEmailConfirmed)
        {
            throw new InvalidOperationException("Confirme seu e-mail antes de entrar.");
        }

        if (!user.IsApprovedByAdmin)
        {
            throw new InvalidOperationException("Sua conta está aguardando aprovação de um administrador.");
        }

        // Rotaciona o refresh token a cada login.
        SetRefreshToken(user);
        await dbContext.SaveChangesAsync();

        return GenerateToken(user);
    }

    public async Task<bool> ConfirmEmailAsync(string email)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();

        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (user is null)
        {
            return false;
        }

        user.IsEmailConfirmed = true;
        await dbContext.SaveChangesAsync();

        return true;
    }

    public async Task<IReadOnlyList<UserSummaryDto>> ListUsersAsync()
    {
        // O Select projeta direto para o DTO: PasswordHash e RefreshToken
        // não entram na consulta e, portanto, nem saem do banco.
        // AsNoTracking porque é leitura pura — nada aqui será alterado.
        return await dbContext.Users
            .AsNoTracking()
            .OrderBy(u => u.IsApprovedByAdmin)
            .ThenByDescending(u => u.CreatedAt)
            .Select(u => new UserSummaryDto
            {
                Id = u.Id,
                Username = u.Username,
                Email = u.Email,
                Role = u.Role,
                IsEmailConfirmed = u.IsEmailConfirmed,
                IsApprovedByAdmin = u.IsApprovedByAdmin,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<bool> ApproveUserAsync(Guid userId)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
        {
            return false;
        }

        user.IsApprovedByAdmin = true;
        await dbContext.SaveChangesAsync();

        return true;
    }

    public async Task<bool> RevokeUserAsync(Guid userId)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
        {
            return false;
        }

        // Impede novos logins e derruba a sessão ativa (anula refresh tokens).
        user.IsApprovedByAdmin = false;
        user.RefreshToken = null;
        user.RefreshTokenExpiryTime = null;

        await dbContext.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteUserAsync(Guid userId)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
        {
            return false;
        }

        // Remove o usuário; os PostVotes dele são apagados em cascata pelo
        // banco. Posts são 100% anônimos (sem FK), então permanecem intactos.
        dbContext.Users.Remove(user);
        await dbContext.SaveChangesAsync();

        return true;
    }

    public async Task<AuthResponseDto> RefreshTokenAsync(RefreshTokenDto refreshTokenDto)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.RefreshToken == refreshTokenDto.RefreshToken)
            ?? throw new UnauthorizedAccessException("Refresh token inválido.");

        if (user.RefreshTokenExpiryTime is null || user.RefreshTokenExpiryTime <= DateTime.UtcNow)
        {
            throw new UnauthorizedAccessException("Refresh token expirado. Faça login novamente.");
        }

        // Rotaciona o refresh token: cada refresh emite um novo par de tokens.
        SetRefreshToken(user);
        await dbContext.SaveChangesAsync();

        return GenerateToken(user);
    }

    private AuthResponseDto GenerateToken(User user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var secret = configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("A configuração 'Jwt:Secret' é obrigatória.");
        var issuer = configuration["Jwt:Issuer"];
        var audience = configuration["Jwt:Audience"];
        var expiresInMinutes = configuration.GetValue("Jwt:ExpirationInMinutes", 60);

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiresInMinutes),
            signingCredentials: credentials);

        return new AuthResponseDto
        {
            Token = new JwtSecurityTokenHandler().WriteToken(token),
            UserId = user.Id,
            Username = user.Username,
            Role = user.Role,
            RefreshToken = user.RefreshToken ?? string.Empty
        };
    }

    /// <summary>
    /// Gera um refresh token criptograficamente seguro (64 bytes em base64) e
    /// define a expiração (DateTime.UtcNow + 7 dias).
    /// </summary>
    private static void SetRefreshToken(User user)
    {
        user.RefreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(RefreshTokenExpirationDays);
    }
}
