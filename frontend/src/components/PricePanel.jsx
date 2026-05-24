import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box, Paper, Typography, Autocomplete, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Tabs, Tab, CircularProgress, Alert, Tooltip, Stack,
} from '@mui/material';
import {
  AttachMoney, Storefront, TrendingUp, TrendingDown,
  Star, LocationOn, Info,
} from '@mui/icons-material';
import { searchCommodities, getCommodityPrices } from '../api/client';

// Star rating component
function StarRating({ value }) {
  if (!value || value <= 0) return <Typography variant="caption" sx={{ color: 'text.secondary' }}>-</Typography>;
  return (
    <Stack direction="row" spacing={0.2}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} sx={{ fontSize: 14, color: i < value ? '#ffaa00' : 'rgba(255,170,0,0.2)' }} />
      ))}
    </Stack>
  );
}

function PricePanel() {
  const [selectedCommodity, setSelectedCommodity] = useState(null);
  const [options, setOptions] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [priceData, setPriceData] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState('');
  const debounceRef = useRef(null);

  // Debounced search — only search when user is typing, not after selection
  useEffect(() => {
    // Clear previous timer
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Don't search if a commodity is selected (input was set by selection)
    if (selectedCommodity) return;

    if (inputValue.length < 1) {
      setOptions([]);
      return;
    }

    // Debounce 300ms
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchCommodities(inputValue);
        setOptions(res.data || []);
      } catch {
        setOptions([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, selectedCommodity]);

  // Fetch prices when commodity selected
  const handleSelect = useCallback(async (commodity) => {
    setSelectedCommodity(commodity);
    setPriceData(null);
    setError('');
    if (!commodity) return;

    setLoading(true);
    try {
      const res = await getCommodityPrices(commodity.id);
      setPriceData(res.data);
      setActiveTab(0); // Reset to buy tab
    } catch (e) {
      setError(e.response?.data?.detail || e.message || '查询失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // Price table rendering
  const renderPriceTable = (entries, priceType) => {
    if (!entries || entries.length === 0) {
      return (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Storefront sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3, mb: 1 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {priceType === 'buy' ? '没有站点收购此商品' : '没有站点出售此商品'}
          </Typography>
        </Box>
      );
    }

    return (
      <TableContainer>
        <Table size="small" sx={{
          '& .MuiTableCell-head': {
            background: 'rgba(0, 212, 255, 0.06)',
            borderBottom: '1px solid rgba(0, 212, 255, 0.15)',
            fontFamily: '"Orbitron", sans-serif',
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.05em',
            color: 'primary.main',
            py: 1.5,
          },
          '& .MuiTableCell-body': {
            borderBottom: '1px solid rgba(0, 212, 255, 0.05)',
            py: 1.2,
          },
        }}>
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ width: 50 }}>#</TableCell>
              <TableCell>站点</TableCell>
              <TableCell>星系</TableCell>
              <TableCell align="right">
                {priceType === 'buy' ? '收购价' : '出售价'}
              </TableCell>
              <TableCell align="center" sx={{ width: 120 }}>评级</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((entry, idx) => {
              const price = priceType === 'buy' ? entry.buy_price : entry.sell_price;
              const isTop = idx === 0;
              const isBottom = idx === entries.length - 1 && entries.length > 1;

              return (
                <TableRow
                  key={entry.terminal_id}
                  sx={{
                    transition: 'background 0.2s',
                    '&:hover': {
                      background: 'rgba(0, 212, 255, 0.04)',
                    },
                    ...(isTop && {
                      background: 'rgba(0, 255, 136, 0.05)',
                    }),
                    ...(isBottom && priceType === 'buy' && {
                      background: 'rgba(255, 51, 102, 0.04)',
                    }),
                  }}
                >
                  <TableCell align="center">
                    <Typography variant="body2" sx={{
                      fontFamily: '"Orbitron", sans-serif',
                      fontSize: '0.75rem',
                      color: isTop ? '#00ff88' : 'text.secondary',
                      fontWeight: isTop ? 700 : 400,
                    }}>
                      {idx + 1}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {entry.terminal_name_zh}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                        {entry.terminal_name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={entry.system_zh}
                      sx={{
                        fontSize: '0.7rem',
                        height: 22,
                        background: 'rgba(0, 212, 255, 0.08)',
                        border: '1px solid rgba(0, 212, 255, 0.15)',
                        color: 'primary.light',
                        fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
                      }}
                    />
                    {entry.planet_zh && (
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.65rem', mt: 0.3 }}>
                        {entry.planet_zh}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{
                      fontFamily: '"Orbitron", sans-serif',
                      fontSize: '0.85rem',
                      fontWeight: isTop ? 700 : 500,
                      color: isTop
                        ? (priceType === 'buy' ? '#00ff88' : '#ff6b35')
                        : isBottom && priceType === 'buy'
                          ? '#ff3366'
                          : 'text.primary',
                    }}>
                      {price?.toLocaleString() ?? '-'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>
                      aUEC/SCU
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <StarRating value={entry.price_star} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box sx={{ display: 'flex', gap: 3, minHeight: 'calc(100vh - 120px)' }}>
      {/* Left: Search panel */}
      <Paper sx={{
        width: 380, flexShrink: 0, p: 3,
        background: 'rgba(13, 19, 33, 0.7)',
        border: '1px solid rgba(0, 212, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        height: 'fit-content',
      }}>
        {/* Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: 2,
            background: 'linear-gradient(135deg, #ffaa00, #ff6b35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 15px rgba(255, 170, 0, 0.3)',
          }}>
            <AttachMoney sx={{ color: '#0a0e17', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{
              fontFamily: '"Orbitron", sans-serif',
              fontWeight: 700, fontSize: '1rem',
              color: '#ffaa00',
            }}>
              价格查询
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              查询商品在各站点的收购/出售价格
            </Typography>
          </Box>
        </Box>

        {/* Commodity search */}
        <Autocomplete
          options={options}
          getOptionLabel={(opt) => typeof opt === 'string' ? opt : (opt.name_zh || opt.name || '')}
          value={selectedCommodity}
          inputValue={inputValue}
          onInputChange={(_, val, reason) => {
            // Only update input on user typing, not on selection/reset
            if (reason === 'input') {
              setInputValue(val);
              // Clear selection when user starts typing again
              if (selectedCommodity) {
                setSelectedCommodity(null);
                setPriceData(null);
              }
            }
          }}
          onChange={(_, val) => handleSelect(val)}
          loading={searching}
          noOptionsText="未找到商品"
          loadingText="搜索中..."
          isOptionEqualToValue={(opt, val) => opt.id === val.id}
          renderInput={(params) => (
            <TextField
              {...params}
              label="搜索商品"
              placeholder="输入商品名称（中/英文）"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {searching ? <CircularProgress size={20} sx={{ color: 'primary.main' }} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          renderOption={(props, option) => (
            <li {...props} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {option.name_zh}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {option.name}
              </Typography>
            </li>
          )}
          sx={{ mb: 2 }}
        />

        {/* Selected commodity info */}
        {selectedCommodity && (
          <Box sx={{
            p: 1.5, mb: 2, borderRadius: 1,
            background: 'rgba(255, 170, 0, 0.08)',
            border: '1px solid rgba(255, 170, 0, 0.2)',
          }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#ffaa00' }}>
              {selectedCommodity.name_zh}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {selectedCommodity.name}
            </Typography>
          </Box>
        )}

        {/* Info hint */}
        {!priceData && !loading && !selectedCommodity && (
          <Box sx={{
            mt: 4, textAlign: 'center', opacity: 0.5,
          }}>
            <Info sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              选择一个商品查看全站价格
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2, '& .MuiAlert-message': { fontSize: '0.85rem' } }}>
            {error}
          </Alert>
        )}
      </Paper>

      {/* Right: Results */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {loading ? (
          <Box sx={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <CircularProgress size={48} sx={{ color: '#ffaa00', mb: 2 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              正在查询价格数据...
            </Typography>
          </Box>
        ) : priceData ? (
          <Box>
            {/* Commodity header */}
            <Paper sx={{
              p: 2.5, mb: 2,
              background: 'rgba(13, 19, 33, 0.7)',
              border: '1px solid rgba(255, 170, 0, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  width: 44, height: 44, borderRadius: 2,
                  background: 'linear-gradient(135deg, #ffaa00, #ff6b35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AttachMoney sx={{ color: '#0a0e17', fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{
                    fontFamily: '"Orbitron", sans-serif',
                    fontWeight: 700, color: '#ffaa00',
                  }}>
                    {priceData.commodity_name_zh}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {priceData.commodity_name}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Tooltip title="收购站点数（你卖给他们）">
                  <Chip
                    icon={<TrendingUp sx={{ fontSize: 16 }} />}
                    label={`${priceData.buy_prices.length} 站收购`}
                    sx={{
                      background: 'rgba(0, 255, 136, 0.1)',
                      border: '1px solid rgba(0, 255, 136, 0.3)',
                      color: '#00ff88',
                      fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
                      fontWeight: 600,
                    }}
                  />
                </Tooltip>
                <Tooltip title="出售站点数（你从他们买）">
                  <Chip
                    icon={<TrendingDown sx={{ fontSize: 16 }} />}
                    label={`${priceData.sell_prices.length} 站出售`}
                    sx={{
                      background: 'rgba(255, 107, 53, 0.1)',
                      border: '1px solid rgba(255, 107, 53, 0.3)',
                      color: '#ff6b35',
                      fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
                      fontWeight: 600,
                    }}
                  />
                </Tooltip>
              </Box>
            </Paper>

            {/* Tab: Buy prices / Sell prices */}
            <Paper sx={{
              background: 'rgba(13, 19, 33, 0.7)',
              border: '1px solid rgba(0, 212, 255, 0.1)',
            }}>
              <Tabs
                value={activeTab}
                onChange={(_, val) => setActiveTab(val)}
                sx={{
                  borderBottom: '1px solid rgba(0, 212, 255, 0.1)',
                  '& .MuiTab-root': {
                    fontFamily: '"Orbitron", sans-serif',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    minHeight: 48,
                  },
                  '& .Mui-selected': {
                    color: activeTab === 0 ? '#00ff88' : '#ff6b35',
                  },
                  '& .MuiTabs-indicator': {
                    background: activeTab === 0 ? '#00ff88' : '#ff6b35',
                    height: 3,
                  },
                }}
              >
                <Tab
                  icon={<TrendingUp sx={{ fontSize: 18 }} />}
                  iconPosition="start"
                  label={`收购价（你卖出）· 最高 ${priceData.buy_prices[0]?.buy_price?.toLocaleString() ?? '-'} aUEC`}
                />
                <Tab
                  icon={<TrendingDown sx={{ fontSize: 18 }} />}
                  iconPosition="start"
                  label={`出售价（你买入）· 最低 ${priceData.sell_prices[0]?.sell_price?.toLocaleString() ?? '-'}`}
                />
              </Tabs>

              <Box sx={{ p: 0 }}>
                {activeTab === 0
                  ? renderPriceTable(priceData.buy_prices, 'buy')
                  : renderPriceTable(priceData.sell_prices, 'sell')
                }
              </Box>
            </Paper>
          </Box>
        ) : (
          <Box sx={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', opacity: 0.5,
          }}>
            <Box sx={{
              width: 100, height: 100, borderRadius: '50%',
              background: 'rgba(255, 170, 0, 0.05)',
              border: '1px solid rgba(255, 170, 0, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mb: 3,
            }}>
              <AttachMoney sx={{ fontSize: 48, color: '#ffaa00', opacity: 0.5 }} />
            </Box>
            <Typography variant="h6" sx={{
              fontFamily: '"Orbitron", sans-serif',
              color: '#ffaa00',
              fontWeight: 600,
              fontSize: '0.9rem',
              mb: 1,
            }}>
              等待价格查询
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
              在左侧搜索并选择一个商品<br/>查看全站价格数据
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default PricePanel;
