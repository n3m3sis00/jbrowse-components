// material-ui components
import Card from '@material-ui/core/Card'
import CardActions from '@material-ui/core/CardActions'
import CardContent from '@material-ui/core/CardContent'
import CardHeader from '@material-ui/core/CardHeader'
import Icon from '@material-ui/core/Icon'
import IconButton from '@material-ui/core/IconButton'
import LinearProgress from '@material-ui/core/LinearProgress'
import Typography from '@material-ui/core/Typography'

// misc
import { HubFile } from '@gmod/ucsc-hub'
import { fetch } from '@gmod/jbrowse-core/util/io'
import PropTypes from 'prop-types'
import React, { useEffect, useState } from 'react'
import sanitizeHtml from 'sanitize-html'

function HubDetails(props) {
  const [hubFile, setHubFile] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  const { hub } = props

  const { url: hubUrl, longLabel, shortLabel } = hub

  useEffect(() => {
    let finished = false
    async function getHubTxt() {
      let response
      try {
        response = await fetch(hubUrl)
      } catch (error) {
        if (!finished)
          setErrorMessage(
            <span>
              <strong>Network error.</strong> {error.message} <br />
              {hubUrl}
            </span>,
          )
        return
      }
      if (!response.ok) {
        if (!finished)
          setErrorMessage(
            <span>
              <strong>Could not access hub.txt file:</strong> <br />
              {hubUrl} <br />
              {response.status}: {response.statusText}
            </span>,
          )
        return
      }
      const responseText = response.buffer.toString()
      let newHubFile = hubFile
      try {
        newHubFile = new HubFile(responseText)
      } catch (error) {
        if (!finished)
          setErrorMessage(
            <span>
              <strong>Could not parse genomes file:</strong> <br />
              {error.message} <br />
              {hubUrl}
            </span>,
          )
        return
      }
      if (!finished) setHubFile(newHubFile)
    }

    getHubTxt()
    return () => {
      finished = true
    }
  }, [hubFile, hubUrl])

  const allowedHtml = {
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p'],
    allowedAttributes: {
      a: ['href'],
    },
  }

  if (errorMessage)
    return (
      <Card>
        <CardContent>
          <Typography color="error">{errorMessage}</Typography>
        </CardContent>
      </Card>
    )
  if (hubFile)
    return (
      <Card>
        <CardHeader title={shortLabel} />
        <CardContent>
          <div
            // It's sanitized, so should be fine to use dangerouslySetInnerHTML
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(longLabel, allowedHtml),
            }}
          />
        </CardContent>
        <CardActions>
          <IconButton
            href={`mailto:${hubFile.get('email')}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            <Icon>email</Icon>
          </IconButton>
          {hubFile.get('descriptionUrl') ? (
            <IconButton
              href={
                new URL(hubFile.get('descriptionUrl'), new URL(hubUrl)).href
              }
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icon>open_in_new</Icon>
            </IconButton>
          ) : null}
        </CardActions>
      </Card>
    )
  return <LinearProgress variant="query" />
}

HubDetails.propTypes = {
  hub: PropTypes.shape().isRequired,
}

export default HubDetails
