using Backend.Api.Modules.Shared.Data;
using Backend.Api.Modules.Shared.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Modules.Shared.Services;

public interface ICenCodeGenerator
{
    Task<string> GenerateCenCodeAsync(Guid empresaId, string prefix);
}

public class CenCodeGenerator : ICenCodeGenerator
{
    private readonly SharedDbContext _sharedContext;

    public CenCodeGenerator(SharedDbContext sharedContext)
    {
        _sharedContext = sharedContext;
    }

    /// <summary>
    /// Generates a CEN code with format: {PREFIX}-{5-digit auto-incremental number}
    /// Example: EMP-00001, CAT-00002, etc.
    /// The number is auto-incremented per empresa and prefix combination.
    /// </summary>
    /// <param name="empresaId">The company ID</param>
    /// <param name="prefix">The prefix (EMP, CAT, UNI, EST, PRO, TIC, COM)</param>
    /// <returns>Generated CEN code</returns>
    public async Task<string> GenerateCenCodeAsync(Guid empresaId, string prefix)
    {
        if (string.IsNullOrWhiteSpace(prefix))
            throw new ArgumentException("Prefix cannot be empty", nameof(prefix));

        // Validate empresa exists
        var empresa = await _sharedContext.Empresas
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == empresaId);

        if (empresa == null)
            throw new InvalidOperationException($"Empresa with ID {empresaId} not found");

        // Get or create counter for this empresa/prefix combination
        var counter = await _sharedContext.CenCounters
            .FirstOrDefaultAsync(c => c.EmpresaId == empresaId && c.Prefix == prefix);

        if (counter == null)
        {
            // Create new counter starting at 1
            counter = new CenCounter
            {
                Id = Guid.NewGuid(),
                EmpresaId = empresaId,
                Prefix = prefix,
                CurrentNumber = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _sharedContext.CenCounters.Add(counter);
        }
        else
        {
            // Increment existing counter
            counter.CurrentNumber++;
            counter.UpdatedAt = DateTime.UtcNow;
            _sharedContext.CenCounters.Update(counter);
        }

        await _sharedContext.SaveChangesAsync();

        // Generate and return CEN code with current number
        return $"{prefix}-{counter.CurrentNumber:D5}";
    }
}
