import { AbiItem, toBN, isAddress, fromWei } from 'web3-utils'
import abiCoder, { AbiCoder } from 'web3-eth-abi'
import { ContractInput, ContractMethod, ProposedTransaction } from './typings/models'
import {
  isArrayFieldType,
  isArrayOfStringsFieldType,
  isBooleanFieldType,
  isIntFieldType,
  isMatrixFieldType,
  isMatrixOfStringsFieldType,
  isMultiDimensionalArrayFieldType,
  isMultiDimensionalArrayOfStringsFieldType,
  isTupleFieldType,
} from './components/forms/fields/fields'

export const enum FETCH_STATUS {
  NOT_ASKED = 'NOT_ASKED',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export enum CHAINS {
  MAINNET = '1',
  MORDEN = '2',
  ROPSTEN = '3',
  RINKEBY = '4',
  GOERLI = '5',
  OPTIMISM = '10',
  KOVAN = '42',
  BSC = '56',
  XDAI = '100',
  POLYGON = '137',
  ENERGY_WEB_CHAIN = '246',
  ARBITRUM = '42161',
  AVALANCHE = '43114',
  VOLTA = '73799',
  AURORA = '1313161554',
}

export const rpcUrlGetterByNetwork: {
  [key in CHAINS]: null | ((token?: string) => string)
} = {
  [CHAINS.MAINNET]: token => `https://mainnet.infura.io/v3/${token}`,
  [CHAINS.MORDEN]: null,
  [CHAINS.ROPSTEN]: null,
  [CHAINS.RINKEBY]: token => `https://rinkeby.infura.io/v3/${token}`,
  [CHAINS.GOERLI]: null,
  [CHAINS.OPTIMISM]: () => 'https://mainnet.optimism.io',
  [CHAINS.KOVAN]: null,
  [CHAINS.BSC]: () => 'https://bsc-dataseed.binance.org',
  [CHAINS.XDAI]: () => 'https://dai.poa.network',
  [CHAINS.POLYGON]: () => 'https://rpc-mainnet.matic.network',
  [CHAINS.ENERGY_WEB_CHAIN]: () => 'https://rpc.energyweb.org',
  [CHAINS.ARBITRUM]: () => 'https://arb1.arbitrum.io/rpc',
  [CHAINS.AVALANCHE]: () => 'https://api.avax.network/ext/bc/C/rpc',
  [CHAINS.VOLTA]: () => 'https://volta-rpc.energyweb.org',
  [CHAINS.AURORA]: () => 'https://mainnet.aurora.dev',
}

export const parseBooleanValue = (value: any): boolean => {
  const isStringValue = typeof value === 'string'
  if (isStringValue) {
    const truthyStrings = ['true', 'True', 'TRUE', '1']
    const isTruthyValue = truthyStrings.some(
      truthyString => truthyString === value.trim().toLowerCase(),
    )

    if (isTruthyValue) {
      return true
    }

    const falsyStrings = ['false', 'False', 'FALSE', '0']
    const isFalsyValue = falsyStrings.some(
      falsyString => falsyString === value.trim().toLowerCase(),
    )

    if (isFalsyValue) {
      return false
    }

    throw SyntaxError('Invalid Boolean value')
  }

  return !!value
}

export const paramTypeNumber = new RegExp(/^(u?int)([0-9]*)(((\[\])|(\[[1-9]+[0-9]*\]))*)?$/)

const parseIntValue = (value: string, fieldType: string) => {
  const trimmedValue = value.replace(/"/g, '').replace(/'/g, '').trim()
  const isEmptyString = trimmedValue === ''

  if (isEmptyString) {
    throw new SyntaxError('invalid empty strings for integers')
  }

  // TODO: create getNumberOfBits(fieldType)
  const bits = Number(fieldType.match(paramTypeNumber)?.[2] || '256')

  // From web3 1.2.5 negative string numbers aren't correctly padded with leading 0's.
  // To fix that we pad the numeric values here as the encode function is expecting a string
  // more info here https://github.com/ChainSafe/web3.js/issues/3772
  return toBN(trimmedValue).toString(10, bits)
}

// parse a string to an Array. Example: from "[1, 2, [3,4]]" returns [ "1", "2", "[3, 4]" ]
// use this function only for Arrays, Matrix and MultiDimensional Arrays of ints, uints, bytes, addresses and booleans
// do NOT use this function for Arrays, Matrix and MultiDimensional Arrays of strings (for strings use JSON.parse() instead)
export const parseStringToArray = (value: string): string[] => {
  let numberOfItems = 0
  let numberOfOtherArrays = 0
  return value
    .trim()
    .slice(1, -1) // remove the first "[" and the last "]"
    .split('')
    .reduce<string[]>((array, char) => {
      const isCommaChar = char === ','

      if (isCommaChar && numberOfOtherArrays === 0) {
        numberOfItems++
        return array
      }

      const isOpenArrayChar = char === '['

      if (isOpenArrayChar) {
        numberOfOtherArrays++
      }

      const isCloseArrayChar = char === ']'

      if (isCloseArrayChar) {
        numberOfOtherArrays--
      }

      array[numberOfItems] = `${array[numberOfItems] || ''}${char}`.trim()

      return array
    }, [])
}

export const baseFieldtypeRegex = new RegExp(/^([a-zA-Z0-9]*)(((\[\])|(\[[1-9]+[0-9]*\]))*)?$/)

// TODO: ADD unit tests!!!
// return the base field type. Example: from "uint128[][2][]" returns "uint128"
export const getBaseFieldType = (fieldType: string): string => {
  const baseFieldType = fieldType.match(baseFieldtypeRegex)?.[1]

  if (!baseFieldType) {
    throw new SyntaxError(`Unknow base field type ${baseFieldType} from ${fieldType}`)
  }

  return baseFieldType
}

// TODO: ADD TESTS FOR THIS
// custom isArray function to return true if a given string is an Array
const isArray = (values: string): boolean => {
  const trimmedValue = values.trim()
  const isArray = trimmedValue.startsWith('[') && trimmedValue.endsWith(']')

  return isArray
}

// TODO: ADD MORE TESTS (to cover bools, bytes etc)
const parseArrayOfValues = (values: string, fieldType: string): any => {
  if (!isArray(values)) {
    throw new SyntaxError('Invalid Array value')
  }

  return parseStringToArray(values).map(itemValue =>
    isArray(itemValue)
      ? parseArrayOfValues(itemValue, fieldType) // recursive call because Matrix and MultiDimensional Arrays field types
      : parseInputValue(
          // recursive call to parseInputValue
          getBaseFieldType(fieldType), // based on the base field type
          itemValue.replace(/"/g, '').replace(/'/g, ''), // removing " and ' chars from the value
        ),
  )
}

// This function is used to parse the user input values
export const parseInputValue = (fieldType: string, value: string): any => {
  const trimmedValue = typeof value === 'string' ? value.trim() : value

  if (isBooleanFieldType(fieldType)) {
    return parseBooleanValue(trimmedValue)
  }

  if (isIntFieldType(fieldType)) {
    return parseIntValue(trimmedValue, fieldType)
  }

  // FIX: fix the issue with the tuples and long numbers
  if (isTupleFieldType(fieldType)) {
    return JSON.parse(trimmedValue)
  }

  // for Arrays, Matrix and MultiDimensional Arrays of strings JSON.parse is required
  if (
    isArrayOfStringsFieldType(fieldType) ||
    isMatrixOfStringsFieldType(fieldType) ||
    isMultiDimensionalArrayOfStringsFieldType(fieldType)
  ) {
    return JSON.parse(trimmedValue)
  }

  if (
    isArrayFieldType(fieldType) ||
    isMatrixFieldType(fieldType) ||
    isMultiDimensionalArrayFieldType(fieldType)
  ) {
    return parseArrayOfValues(trimmedValue, fieldType)
  }

  return value
}

export const isInputValueValid = (val: string) => {
  const value = Number(val)
  const isHexValue = val?.startsWith?.('0x')
  const isNegativeValue = value < 0

  if (isNaN(value) || isNegativeValue || isHexValue) {
    return false
  }

  return true
}

export const getCustomDataError = (value: string | undefined) => {
  return `Has to be a valid strict hex data${
    !value?.startsWith('0x') ? ' (it must start with 0x)' : ''
  }`
}

export const isValidAddress = (address: string | null) => {
  if (!address) {
    return false
  }
  return isAddress(address)
}

const NON_VALID_CONTRACT_METHODS = ['receive', 'fallback']

export const encodeToHexData = (
  contractMethod: ContractMethod | undefined,
  contractFieldsValues: any,
) => {
  const contractMethodName = contractMethod?.name
  const contractFields = contractMethod?.inputs || []

  const isValidContractMethod =
    contractMethodName && !NON_VALID_CONTRACT_METHODS.includes(contractMethodName)

  if (isValidContractMethod) {
    try {
      const parsedValues = contractFields.map((contractField: ContractInput, index) => {
        const contractFieldName = contractField.name || index
        const cleanValue = contractFieldsValues[contractFieldName] || ''

        return parseInputValue(contractField.type, cleanValue)
      })
      const abi = abiCoder as unknown // a bug in the web3-eth-abi types
      const hexEncondedData = (abi as AbiCoder).encodeFunctionCall(
        contractMethod as AbiItem,
        parsedValues,
      )

      return hexEncondedData
    } catch (error) {
      console.log('Error encoding current form values to hex data: ', error)
    }
  }
}

export const weiToEther = (wei: string) => {
  return fromWei(wei, 'ether')
}

export const getTransactionText = (description: ProposedTransaction['description']) => {
  const { contractMethod, customTransactionData } = description

  const isCustomHexDataTx = !!customTransactionData
  const isContractInteractionTx = !!contractMethod
  const isTokenTransferTx = !isCustomHexDataTx && !isContractInteractionTx

  if (isTokenTransferTx) {
    return 'Transfer'
  }

  if (isCustomHexDataTx) {
    return 'Custom hex data'
  }

  if (isContractInteractionTx) {
    return contractMethod.name
  }

  // empty tx description as a fallback
  return ''
}

export const getInputTypeHelper = (input: ContractInput): string => {
  // This code renders a helper for the input text.
  if (input.type.startsWith('tuple') && input.components) {
    return `tuple(${input.components
      .map((i: ContractInput) => {
        return getInputTypeHelper(i)
      })
      .toString()})${input.type.endsWith('[]') ? '[]' : ''}`
  } else {
    return input.type
  }
}
